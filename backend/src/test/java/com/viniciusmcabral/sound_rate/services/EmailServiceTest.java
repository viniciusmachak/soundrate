package com.viniciusmcabral.sound_rate.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Properties;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.thymeleaf.context.IContext;
import org.thymeleaf.spring6.SpringTemplateEngine;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

	@Mock
	private JavaMailSender mailSender;

	@Mock
	private SpringTemplateEngine templateEngine;

	private EmailService emailService;

	@BeforeEach
	void setUp() {
		emailService = new EmailService(mailSender, templateEngine, new SyncTaskExecutor(), "no-reply@soundrate.test",
				"https://soundrate.test/", "smtp.soundrate.test");
	}

	@AfterEach
	void clearSynchronization() {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.clearSynchronization();
		}
	}

	@Test
	void passwordResetLinkUsesConfiguredFrontendUrl() {
		when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
		when(templateEngine.process(eq("password-reset-email"), any(IContext.class))).thenReturn("<p>reset</p>");

		emailService.sendPasswordResetEmail("listener@example.com", "listener", "abc-123");

		ArgumentCaptor<IContext> contextCaptor = ArgumentCaptor.forClass(IContext.class);
		verify(templateEngine).process(eq("password-reset-email"), contextCaptor.capture());
		assertThat(contextCaptor.getValue().getVariable("resetLink"))
				.isEqualTo("https://soundrate.test/reset-password?token=abc-123");
		verify(mailSender).send(any(MimeMessage.class));
	}

	@Test
	void emailIsDeferredUntilTransactionCommits() {
		when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
		when(templateEngine.process(eq("welcome-email"), any(IContext.class))).thenReturn("<p>welcome</p>");
		TransactionSynchronizationManager.initSynchronization();

		emailService.sendWelcomeEmail("listener@example.com", "listener");
		verify(mailSender, never()).send(any(MimeMessage.class));

		TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
		verify(mailSender).send(any(MimeMessage.class));
	}

	@Test
	void emailIsSkippedWhenMailHostIsMissing() {
		var unconfigured = new EmailService(mailSender, templateEngine, new SyncTaskExecutor(),
				"no-reply@soundrate.test", "https://soundrate.test", "");

		unconfigured.sendWelcomeEmail("listener@example.com", "listener");

		verify(mailSender, never()).send(any(MimeMessage.class));
	}
}
