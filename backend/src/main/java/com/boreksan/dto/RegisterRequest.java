package com.boreksan.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Username cannot be blank")
    @Size(min = 2, message = "Username must be at least 2 characters long")
    private String username;

    @NotBlank(message = "Password cannot be blank")
    @Pattern(
            // At least 8 characters, one uppercase, one lowercase, one number, one special character
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[.@$!%*?&])[A-Za-z\\d.@$!%*?&]{8,}$", message = "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character")
    private String password;

    @NotBlank(message = "Shop name cannot be blank")
    private String shopName; // Exp: "Lale Pastanesi"

    @NotBlank(message = "Phone cannot be blank")
    @Pattern(
            regexp = "^\\+?[0-9]{10,15}$", // Phone number validation
            message = "Phone number must be valid"
    )
    private String phone; // Exp: "0555..."

    @NotBlank(message = "Address cannot be blank")
    private String address; // Exp: "Atatürk Cad. No:5..."
}