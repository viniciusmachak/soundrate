package com.viniciusmcabral.sound_rate.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.viniciusmcabral.sound_rate.dtos.request.ForgotPasswordRequestDTO;
import com.viniciusmcabral.sound_rate.dtos.request.GoogleLoginRequestDTO;
import com.viniciusmcabral.sound_rate.dtos.request.LoginRequestDTO;
import com.viniciusmcabral.sound_rate.dtos.request.RegisterRequestDTO;
import com.viniciusmcabral.sound_rate.dtos.request.ResetPasswordRequestDTO;
import com.viniciusmcabral.sound_rate.services.GoogleIdentityService.GoogleProfile;
import com.viniciusmcabral.sound_rate.support.AbstractIntegrationTest;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

	@Test
	void registerCreatesUserAndReturnsJwt() throws Exception {
		mockMvc.perform(post("/api/v1/auth/register").contentType(APPLICATION_JSON)
				.content(json(new RegisterRequestDTO("newuser", "newuser@example.com", "secret123"))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(jsonPath("$.user.username").value("newuser"));

		var savedUser = userRepository.findByUsername("newuser").orElseThrow();
		assertThat(passwordEncoder.matches("secret123", savedUser.getPassword())).isTrue();
	}

	@Test
	void loginReturnsTokenForActiveUser() throws Exception {
		createUser("listener", "secret123");

		mockMvc.perform(post("/api/v1/auth/login").contentType(APPLICATION_JSON)
				.content(json(new LoginRequestDTO("listener", "secret123"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(jsonPath("$.user.username").value("listener"));
	}

	@Test
	void resetPasswordFlowAllowsLoggingInWithNewPassword() throws Exception {
		createUser("listener", "secret123");

		mockMvc.perform(post("/api/v1/auth/forgot-password").contentType(APPLICATION_JSON)
				.content(json(new ForgotPasswordRequestDTO("listener@example.com"))))
				.andExpect(status().isOk());

		var resetToken = passwordResetTokenRepository.findAll().stream().findFirst().orElseThrow();

		mockMvc.perform(post("/api/v1/auth/reset-password").contentType(APPLICATION_JSON)
				.content(json(new ResetPasswordRequestDTO(resetToken.getToken(), "newsecret123"))))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/v1/auth/login").contentType(APPLICATION_JSON)
				.content(json(new LoginRequestDTO("listener", "newsecret123"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString());
	}

	@Test
	void disabledAccountCannotLogIn() throws Exception {
		createUser("disabled", "secret123", false);

		mockMvc.perform(post("/api/v1/auth/login").contentType(APPLICATION_JSON)
				.content(json(new LoginRequestDTO("disabled", "secret123"))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error").value("Unauthorized"));
	}

	@Test
	void googleLoginCreatesAccountOnceAndReusesItAfterwards() throws Exception {
		when(googleIdentityService.verify("google-token")).thenReturn(Optional.of(
				new GoogleProfile("google-sub-1", "new.listener@gmail.com", true, "New Listener", "https://lh3.example/p.jpg")));

		for (int attempt = 0; attempt < 2; attempt++) {
			mockMvc.perform(post("/api/v1/auth/google").contentType(APPLICATION_JSON)
					.content(json(new GoogleLoginRequestDTO("google-token"))))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.token").isString())
					.andExpect(jsonPath("$.user.username").value("new.listener"));
		}

		assertThat(userRepository.findAll()).hasSize(1);
		assertThat(userRepository.findByGoogleId("google-sub-1")).isPresent();
	}

	@Test
	void googleLoginLinksExistingAccountWithSameEmail() throws Exception {
		createUser("listener", "secret123");
		when(googleIdentityService.verify("google-token")).thenReturn(Optional.of(
				new GoogleProfile("google-sub-2", "listener@example.com", true, "Listener", null)));

		mockMvc.perform(post("/api/v1/auth/google").contentType(APPLICATION_JSON)
				.content(json(new GoogleLoginRequestDTO("google-token"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.username").value("listener"));

		assertThat(userRepository.findByUsername("listener").orElseThrow().getGoogleId()).isEqualTo("google-sub-2");
	}

	@Test
	void googleLoginRejectsInvalidCredential() throws Exception {
		when(googleIdentityService.verify("forged")).thenReturn(Optional.empty());

		mockMvc.perform(post("/api/v1/auth/google").contentType(APPLICATION_JSON)
				.content(json(new GoogleLoginRequestDTO("forged"))))
				.andExpect(status().isUnauthorized());

		assertThat(userRepository.findAll()).isEmpty();
	}
}
