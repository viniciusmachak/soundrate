package com.viniciusmcabral.sound_rate.dtos.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequestDTO(

		@NotBlank(message = "Google credential can't be blank") String credential) {
}
