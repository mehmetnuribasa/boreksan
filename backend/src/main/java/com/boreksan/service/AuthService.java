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
        // Daha kullanıcı oluşturmadan önce kontrol et: aynı username var mı?
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new UsernameAlreadyExistsException("Username already exists");
        }

        var user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // Şifreyi gizle
        // Yeni kayıt olan herkes CUSTOMER olacak (role artık request'ten gelmiyor)
        user.setRole(Role.CUSTOMER);

        userRepository.save(user);

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        // Kullanıcıya ait eski refresh token'ları temizle (varsa)
        refreshTokenRepository.deleteByUser(user);

        // Yeni refresh token'ı DB'ye kaydet
        saveRefreshToken(user, refreshToken);

        // Refresh token'ı HttpOnly cookie olarak ayarla
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

        // Kullanıcıya ait eski refresh token'ları temizle (varsa)
        refreshTokenRepository.deleteByUser(user);

        // Yeni refresh token'ı DB'ye kaydet
        saveRefreshToken(user, refreshToken);

        // Refresh token'ı HttpOnly cookie olarak ayarla
        addRefreshTokenCookie(response, refreshToken);

        return new AuthResponse(accessToken);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request, HttpServletResponse response) {
        String refreshToken = request.getRefreshToken();
        String username = jwtService.extractUsernameFromRefreshToken(refreshToken);

        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidTokenException("User not found for refresh token"));

        // DB'de bu token kayıtlı mı ve iptal edilmemiş mi?
        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new InvalidTokenException("Refresh token not found in database"));

        if (storedToken.isRevoked() || storedToken.getExpiryDate().before(new Date())) {
            throw new InvalidTokenException("Refresh token is expired or revoked");
        }

        if (!jwtService.isRefreshTokenValid(refreshToken, user)) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        var newAccessToken = jwtService.generateAccessToken(user);

        // İsteğe bağlı: token rotation istenirse burada yeni refresh token
        // üretilebilir.
        // Senin isteğine göre mevcut refresh token'ı koruyoruz, rotation yok.

        // Cookie'yi tekrar yazarak süresini yenileyebiliriz (isteğe bağlı).
        addRefreshTokenCookie(response, refreshToken);

        return new AuthResponse(newAccessToken);
    }

    private void saveRefreshToken(User user, String token) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        // JWT servisindeki süre ile uyumlu şekilde 7 gün sonrasını atıyoruz
        refreshToken.setExpiryDate(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7));
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // prod'da HTTPS ile kullanılmalı
        cookie.setPath("/"); // tüm endpoint'lerde erişilebilir
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 gün (saniye)
        response.addCookie(cookie);
    }
}