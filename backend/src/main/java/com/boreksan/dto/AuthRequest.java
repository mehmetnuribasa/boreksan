package com.boreksan.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class AuthRequest {

    private String username;

    private String password;
}