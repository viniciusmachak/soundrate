package com.viniciusmcabral.sound_rate.services;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

/**
 * Checks the ID tokens the Google sign-in button hands to the frontend: signature
 * (against Google's cached public keys), issuer, expiry and that it was issued for our client id.
 */
@Service
public class GoogleIdentityService {

	private static final Logger logger = LoggerFactory.getLogger(GoogleIdentityService.class);

	public record GoogleProfile(String subject, String email, boolean emailVerified, String name, String pictureUrl) {
	}

	private final GoogleIdTokenVerifier verifier;

	public GoogleIdentityService(@Value("${google.client-id}") String clientId) {
		this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
				.setAudience(List.of(clientId)).build();
	}

	public Optional<GoogleProfile> verify(String credential) {
		try {
			GoogleIdToken idToken = verifier.verify(credential);
			if (idToken == null) return Optional.empty();

			GoogleIdToken.Payload payload = idToken.getPayload();
			return Optional.of(new GoogleProfile(payload.getSubject(), payload.getEmail(),
					Boolean.TRUE.equals(payload.getEmailVerified()), (String) payload.get("name"),
					(String) payload.get("picture")));
		} catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
			logger.warn("Could not verify Google ID token: {}", e.getMessage());
			return Optional.empty();
		}
	}
}
