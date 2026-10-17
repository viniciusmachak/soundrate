package com.viniciusmcabral.sound_rate.config.security.filters;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {

	private MockHttpServletResponse post(AuthRateLimitFilter filter, String path, String ip) throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
		request.setRemoteAddr(ip);
		MockHttpServletResponse response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		return response;
	}

	@Test
	void blocksLoginAfterLimitAndReportsRetryAfter() throws Exception {
		AuthRateLimitFilter filter = new AuthRateLimitFilter(true, Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

		for (int attempt = 0; attempt < 10; attempt++) {
			assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1").getStatus()).isEqualTo(200);
		}
		MockHttpServletResponse blocked = post(filter, "/api/v1/auth/login", "10.0.0.1");

		assertThat(blocked.getStatus()).isEqualTo(429);
		assertThat(blocked.getHeader("Retry-After")).isEqualTo("60");
		assertThat(blocked.getContentAsString()).contains("Too many attempts");
	}

	@Test
	void limitsEachIpAndEndpointSeparately() throws Exception {
		AuthRateLimitFilter filter = new AuthRateLimitFilter(true, Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
		for (int attempt = 0; attempt < 5; attempt++) {
			post(filter, "/api/v1/auth/forgot-password", "10.0.0.1");
		}

		assertThat(post(filter, "/api/v1/auth/forgot-password", "10.0.0.1").getStatus()).isEqualTo(429);
		assertThat(post(filter, "/api/v1/auth/forgot-password", "10.0.0.2").getStatus()).isEqualTo(200);
		assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1").getStatus()).isEqualTo(200);
	}

	@Test
	void allowsRequestsAgainAfterTheWindow() throws Exception {
		MutableClock clock = new MutableClock();
		AuthRateLimitFilter filter = new AuthRateLimitFilter(true, clock);
		for (int attempt = 0; attempt < 11; attempt++) {
			post(filter, "/api/v1/auth/login", "10.0.0.1");
		}

		clock.advanceSeconds(61);

		assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1").getStatus()).isEqualTo(200);
	}

	@Test
	void ignoresOtherEndpointsAndCanBeDisabled() throws Exception {
		AuthRateLimitFilter enabled = new AuthRateLimitFilter(true, Clock.systemUTC());
		AuthRateLimitFilter disabled = new AuthRateLimitFilter(false, Clock.systemUTC());
		for (int attempt = 0; attempt < 20; attempt++) {
			assertThat(post(enabled, "/api/v1/reviews", "10.0.0.1").getStatus()).isEqualTo(200);
			assertThat(post(disabled, "/api/v1/auth/login", "10.0.0.1").getStatus()).isEqualTo(200);
		}
	}

	private static class MutableClock extends Clock {
		private Instant now = Instant.EPOCH;

		void advanceSeconds(long seconds) {
			now = now.plusSeconds(seconds);
		}

		@Override
		public ZoneOffset getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(java.time.ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}
	}
}
