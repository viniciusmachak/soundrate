package com.viniciusmcabral.sound_rate.services;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

class EmailTemplatesTest {

	private SpringTemplateEngine templateEngine;

	@BeforeEach
	void setUp() {
		ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
		resolver.setPrefix("templates/");
		resolver.setSuffix(".html");
		resolver.setCharacterEncoding("UTF-8");
		templateEngine = new SpringTemplateEngine();
		templateEngine.setTemplateResolver(resolver);
	}

	@ParameterizedTest
	@ValueSource(strings = { "welcome-email", "password-reset-email", "deletion-email" })
	void templatesRenderWithSharedLayout(String templateName) {
		Context context = new Context();
		context.setVariable("username", "listener");
		context.setVariable("frontendUrl", "https://soundrate.test");
		context.setVariable("resetLink", "https://soundrate.test/reset-password?token=abc");

		String html = templateEngine.process(templateName, context);

		assertThat(html).contains("listener").contains("https://soundrate.test").contains("Soundrate")
				.doesNotContain("th:text").doesNotContain("th:replace").doesNotContain("${");
	}

	@ParameterizedTest
	@ValueSource(strings = { "password-reset-email" })
	void passwordResetEmailContainsLinkTwice(String templateName) {
		Context context = new Context();
		context.setVariable("username", "listener");
		context.setVariable("frontendUrl", "https://soundrate.test");
		context.setVariable("resetLink", "https://soundrate.test/reset-password?token=abc");

		String html = templateEngine.process(templateName, context);

		assertThat(html.split("reset-password\\?token=abc", -1)).hasSizeGreaterThanOrEqualTo(4);
	}
}
