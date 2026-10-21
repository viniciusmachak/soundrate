package com.viniciusmcabral.sound_rate.services;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.viniciusmcabral.sound_rate.dtos.request.RegisterRequestDTO;
import com.viniciusmcabral.sound_rate.dtos.response.AuthResponseDTO;
import com.viniciusmcabral.sound_rate.dtos.response.UserDTO;
import com.viniciusmcabral.sound_rate.models.PasswordResetTokenModel;
import com.viniciusmcabral.sound_rate.models.UserModel;
import com.viniciusmcabral.sound_rate.repositories.PasswordResetTokenRepository;
import com.viniciusmcabral.sound_rate.repositories.UserRepository;
import com.viniciusmcabral.sound_rate.services.GoogleIdentityService.GoogleProfile;

@Service
public class AuthService implements UserDetailsService {

	private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final PasswordResetTokenRepository tokenRepository;
	private final EmailService emailService;
	private final GoogleIdentityService googleIdentityService;

	private static final int USERNAME_MAX_LENGTH = 50;
	private static final int USERNAME_MIN_LENGTH = 3;

	public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenService tokenService,
			PasswordResetTokenRepository tokenRepository, EmailService emailService,
			GoogleIdentityService googleIdentityService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.tokenService = tokenService;
		this.tokenRepository = tokenRepository;
		this.emailService = emailService;
		this.googleIdentityService = googleIdentityService;
	}

	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		return userRepository.findByLoginAndActiveTrue(username).orElseThrow(
				() -> new UsernameNotFoundException("User not found or is inactive with identifier: " + username));
	}

	@Transactional
	public AuthResponseDTO registerUser(RegisterRequestDTO data) {
		if (userRepository.findByUsername(data.username()).isPresent()) {
			logger.warn("Registration rejected: username '{}' already exists.", data.username());
			throw new IllegalStateException("Username already exists");
		}

		if (userRepository.findByEmail(data.email()).isPresent()) {
			logger.warn("Registration rejected: email '{}' already in use.", data.email());
			throw new IllegalStateException("Email already in use");
		}

		UserModel newUser = new UserModel(data.username(), data.email(), passwordEncoder.encode(data.password()));

		String avatarUrl = "https://api.dicebear.com/8.x/initials/svg?seed=" + newUser.getUsername();
		newUser.setAvatarUrl(avatarUrl);

		userRepository.save(newUser);
		logger.info("User '{}' registered successfully.", newUser.getUsername());
		emailService.sendWelcomeEmail(newUser.getEmail(), newUser.getUsername());

		String token = tokenService.generateToken(newUser);
		UserDTO userDTO = new UserDTO(newUser.getId(), newUser.getUsername(), newUser.getAvatarUrl(),
				newUser.getEmail(), newUser.getBio());

		return new AuthResponseDTO(token, userDTO);
	}

	/**
	 * Signs in with a Google ID token: the Google account already linked, else the
	 * account with the same (Google-verified) email, which gets linked, else a new account.
	 */
	@Transactional
	public AuthResponseDTO loginWithGoogle(String credential) {
		GoogleProfile profile = googleIdentityService.verify(credential)
				.orElseThrow(() -> new BadCredentialsException("Invalid Google credential."));

		if (!profile.emailVerified() || profile.email() == null) {
			logger.warn("Google sign-in rejected: email not verified for subject '{}'.", profile.subject());
			throw new BadCredentialsException("Google account email is not verified.");
		}

		UserModel user = userRepository.findByGoogleId(profile.subject())
				.or(() -> userRepository.findByEmail(profile.email()).map(existing -> linkGoogleAccount(existing, profile)))
				.orElseGet(() -> registerGoogleUser(profile));

		if (!user.isActive()) {
			logger.warn("Google sign-in rejected: user '{}' is inactive.", user.getUsername());
			throw new DisabledException("User account is disabled.");
		}

		String token = tokenService.generateToken(user);
		UserDTO userDTO = new UserDTO(user.getId(), user.getUsername(), user.getAvatarUrl(), user.getEmail(),
				user.getBio());

		return new AuthResponseDTO(token, userDTO);
	}

	private UserModel linkGoogleAccount(UserModel user, GoogleProfile profile) {
		if (user.isActive()) {
			user.setGoogleId(profile.subject());
			userRepository.save(user);
			logger.info("Linked Google account to user '{}'.", user.getUsername());
		}
		return user;
	}

	private UserModel registerGoogleUser(GoogleProfile profile) {
		// Google-only accounts get an unknowable password; "forgot password" lets them set a real one.
		String randomPassword = passwordEncoder.encode(UUID.randomUUID().toString());
		UserModel newUser = new UserModel(generateUniqueUsername(profile), profile.email(), randomPassword);
		newUser.setGoogleId(profile.subject());
		newUser.setAvatarUrl(profile.pictureUrl() != null ? profile.pictureUrl()
				: "https://api.dicebear.com/8.x/initials/svg?seed=" + newUser.getUsername());

		userRepository.save(newUser);
		logger.info("User '{}' registered with Google.", newUser.getUsername());
		emailService.sendWelcomeEmail(newUser.getEmail(), newUser.getUsername());
		return newUser;
	}

	/** Builds a username from the email's local part, adding a numeric suffix until it's free. */
	private String generateUniqueUsername(GoogleProfile profile) {
		String localPart = profile.email().substring(0, profile.email().indexOf('@'));
		String base = Normalizer.normalize(localPart, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
				.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._]", "");
		if (base.length() < USERNAME_MIN_LENGTH) base = "user" + base;
		base = base.substring(0, Math.min(base.length(), USERNAME_MAX_LENGTH - 5));

		String candidate = base;
		while (userRepository.findByUsername(candidate).isPresent()) {
			candidate = base + ThreadLocalRandom.current().nextInt(1000, 10000);
		}
		return candidate;
	}

	@Transactional
	public void requestPasswordReset(String userEmail) {
		Optional<UserModel> userOpt = userRepository.findByEmailAndActiveTrue(userEmail);

		if (userOpt.isEmpty()) {
			logger.info("Password reset requested for unknown or inactive email '{}'.", userEmail);
			return;
		}

		UserModel user = userOpt.get();
		tokenRepository.deleteByUser(user);

		String tokenString = UUID.randomUUID().toString();
		PasswordResetTokenModel passwordResetToken = new PasswordResetTokenModel();
		passwordResetToken.setToken(tokenString);
		passwordResetToken.setUser(user);
		passwordResetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
		tokenRepository.save(passwordResetToken);
		logger.info("Issued password reset token for user '{}'.", user.getUsername());

		emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), tokenString);
	}

	@Transactional
	public void performPasswordReset(String token, String newPassword) {
		PasswordResetTokenModel resetToken = tokenRepository.findByToken(token)
				.orElseThrow(() -> new IllegalArgumentException("Invalid password reset token."));

		if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
			tokenRepository.delete(resetToken);
			logger.warn("Rejected expired password reset token for user '{}'.", resetToken.getUser().getUsername());
			throw new IllegalArgumentException("Password reset token has expired.");
		}

		UserModel user = resetToken.getUser();
		String encodedPassword = passwordEncoder.encode(newPassword);

		user.setPassword(encodedPassword);
		userRepository.save(user);
		tokenRepository.delete(resetToken);
		logger.info("Completed password reset for user '{}'.", user.getUsername());
	}
}
