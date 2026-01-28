package com.boreksan.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {

    // Sadece access token client'a JSON body ile gider
    private String accessToken;
}