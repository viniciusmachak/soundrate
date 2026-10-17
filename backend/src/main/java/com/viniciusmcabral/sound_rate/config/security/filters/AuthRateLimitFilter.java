package com.viniciusmcabral.sound_rate.config.security.filters;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Limits how often a client IP can hit the public auth endpoints, to slow down
 * password guessing and stop the reset endpoint from being used to spam inboxes.
 * Fixed windows kept in memory: enough for a single backend instance.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

	private static final Logger logger = LoggerFactory.getLogger(AuthRateLimitFilter.class);
	private static final int MAX_TRACKED_KEYS = 10_000;

	record Rule(String path, int maxRequests, Duration window) {
	}

	private record Window(long startMillis, int count) {
	}

	static final List<Rule> RULES = List.of(
			new Rule("/api/v1/auth/login", 10, Duration.ofMinutes(1)),
			new Rule("/api/v1/auth/register", 5, Duration.ofMinutes(10)),
			new Rule("/api/v1/auth/forgot-password", 5, Duration.ofMinutes(15)),
			new Rule("/api/v1/auth/reset-password", 10, Duration.ofMinutes(15)));

	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final boolean enabled;
	private final Clock clock;

	@Autowired
	public AuthRateLimitFilter(@Value("${app.rate-limit.enabled:true}") boolean enabled) {
		this(enabled, Clock.systemUTC());
	}

	AuthRateLimitFilter(boolean enabled, Clock clock) {
		this.enabled = enabled;
		this.clock = clock;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !enabled || !"POST".equals(request.getMethod()) || findRule(request.getRequestURI()).isEmpty();
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Rule rule = findRule(request.getRequestURI()).orElseThrow();
		long now = clock.millis();
		long windowMillis = rule.window().toMillis();
		String key = rule.path() + '|' + request.getRemoteAddr();

		Window window = windows.compute(key, (k, current) -> current == null || now - current.startMillis() >= windowMillis
				? new Window(now, 1)
				: new Window(current.startMillis(), current.count() + 1));

		if (window.count() > rule.maxRequests()) {
			long retryAfterSeconds = Math.max(1, (window.startMillis() + windowMillis - now + 999) / 1000);
			logger.warn("Rate limit hit on '{}' from '{}'.", rule.path(), request.getRemoteAddr());
			writeTooManyRequests(response, rule.path(), retryAfterSeconds);
			return;
		}

		evictExpiredIfLarge(now);
		chain.doFilter(request, response);
	}

	private Optional<Rule> findRule(String path) {
		return RULES.stream().filter(rule -> rule.path().equals(path)).findFirst();
	}

	private void evictExpiredIfLarge(long now) {
		if (windows.size() <= MAX_TRACKED_KEYS) return;
		long longestWindow = RULES.stream().mapToLong(rule -> rule.window().toMillis()).max().orElse(0);
		windows.entrySet().removeIf(entry -> now - entry.getValue().startMillis() >= longestWindow);
	}

	private void writeTooManyRequests(HttpServletResponse response, String path, long retryAfterSeconds)
			throws IOException {
		response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
		response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("""
				{"status":429,"error":"Too Many Requests","message":"Too many attempts. Please wait %d seconds and try again.","path":"%s"}"""
				.formatted(retryAfterSeconds, path));
	}
}
