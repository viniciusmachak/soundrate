package com.viniciusmcabral.sound_rate.services;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

	private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

	private final JavaMailSender mailSender;
	private final SpringTemplateEngine templateEngine;
	private final TaskExecutor taskExecutor;
	private final String fromEmail;
	private final String frontendUrl;
	private final String mailHost;

	public EmailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine, TaskExecutor taskExecutor,
			@Value("${app.mail.from}") String fromEmail, @Value("${app.frontend-url}") String frontendUrl,
			@Value("${spring.mail.host:}") String mailHost) {
		this.mailSender = mailSender;
		this.templateEngine = templateEngine;
		this.taskExecutor = taskExecutor;
		this.fromEmail = fromEmail;
		this.frontendUrl = frontendUrl.replaceAll("/+$", "");
		this.mailHost = mailHost;
	}

	public void sendWelcomeEmail(String to, String username) {
		Context context = baseContext(username);
		dispatch("Welcome", to, "Welcome to Soundrate", "welcome-email", context);
	}

	public void sendAccountDeletionEmail(String to, String username) {
		Context context = baseContext(username);
		dispatch("Account deletion", to, "Your Soundrate account has been deleted", "deletion-email", context);
	}

	public void sendPasswordResetEmail(String to, String username, String resetToken) {
		Context context = baseContext(username);
		context.setVariable("resetLink",
				frontendUrl + "/reset-password?token=" + URLEncoder.encode(resetToken, StandardCharsets.UTF_8));
		dispatch("Password reset", to, "Reset your Soundrate password", "password-reset-email", context);
	}

	private Context baseContext(String username) {
		Context context = new Context();
		context.setVariable("username", username);
		context.setVariable("frontendUrl", frontendUrl);
		return context;
	}

	/**
	 * Sends after the surrounding transaction commits (so tokens and users exist
	 * when the recipient acts on the email) and off the request thread.
	 */
	private void dispatch(String emailType, String to, String subject, String templateName, Context context) {
		Runnable send = () -> sendEmail(emailType, to, subject, templateName, context);

		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					taskExecutor.execute(send);
				}
			});
			return;
		}

		taskExecutor.execute(send);
	}

	private void sendEmail(String emailType, String to, String subject, String templateName, Context context) {
		if (mailHost == null || mailHost.isBlank()) {
			logger.warn("{} email to '{}' skipped: MAIL_HOST is not configured. Variables: {}.", emailType, to,
					context.getVariableNames().stream().map(name -> name + "=" + context.getVariable(name)).toList());
			return;
		}

		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
			helper.setFrom(fromEmail, "Soundrate");
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(templateEngine.process(templateName, context), true);
			mailSender.send(message);
			logger.info("{} email sent to '{}'.", emailType, to);
		} catch (MailException | MessagingException | UnsupportedEncodingException exception) {
			logger.error("Failed to send {} email to '{}': {}.", emailType.toLowerCase(), to, exception.getMessage());
		}
	}
}
