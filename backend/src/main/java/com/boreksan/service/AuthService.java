package com.boreksan.service;

import com.boreksan.dto.*;
import com.boreksan.entity.User;
import com.boreksan.entity.RefreshToken;
import com.boreksan.entity.enums.Role;
import com.boreksan.repository.UserRepository;
import com.boreksan.repository.RefreshTokenRepository;
import com.boreksan.exception.InvalidTokenException;
import com.boreksan.exception.UsernameAlreadyExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Date;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        // Check if the username already exists before creating a new user
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new UsernameAlreadyExistsException("Username already exists");
        }

        var user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // Encrypt the password
        user.setRole(Role.CUSTOMER);    // All new users are assigned the CUSTOMER role
        user.setShopName(request.getShopName()); // Set shop name
        user.setPhone(request.getPhone());       // Set phone number
        user.setAddress(request.getAddress());   // Set address

        userRepository.save(user);

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        // Clear any existing refresh tokens for the user (if any)
        refreshTokenRepository.deleteByUser(user);

        // Save the new refresh token to the database
        saveRefreshToken(user, refreshToken);

        // Set the refresh token as an HttpOnly cookie
        addRefreshTokenCookie(response, refreshToken);

        return new AuthResponse(accessToken);
    }

    @Transactional
    public AuthResponse authenticate(AuthRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        var user = userRepository.findByUsername(request.getUsername()).orElseThrow();

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        // Clear any existing refresh tokens for the user (if any)
        refreshTokenRepository.deleteByUser(user);

        // Save the new refresh token to the database
        saveRefreshToken(user, refreshToken);

        // Set the refresh token as an HttpOnly cookie
        addRefreshTokenCookie(response, refreshToken);

        return new AuthResponse(accessToken);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request, HttpServletResponse response) {
        String refreshToken = request.getRefreshToken();
        String username = jwtService.extractUsernameFromRefreshToken(refreshToken);

        // Check if the user exists
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidTokenException("User not found for refresh token"));

        // Check if the token exists in the database and is not revoked
        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new InvalidTokenException("Refresh token not found in database"));

        // Check if the token is revoked or expired
        if (storedToken.isRevoked() || storedToken.getExpiryDate().before(new Date())) {
            throw new InvalidTokenException("Refresh token is expired or revoked");
        }

        // Validate the token
        if (!jwtService.isRefreshTokenValid(refreshToken, user)) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        var newAccessToken = jwtService.generateAccessToken(user);

        return new AuthResponse(newAccessToken);
    }

    private void saveRefreshToken(User user, String token) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        // Set the expiration date to 7 days from now, consistent with the JWT service
        refreshToken.setExpiryDate(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7));
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Should be true in production with HTTPS, TEMPORARILY false
        cookie.setPath("/"); // Accessible on all endpoints
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days (in seconds)
        response.addCookie(cookie);
    }
}