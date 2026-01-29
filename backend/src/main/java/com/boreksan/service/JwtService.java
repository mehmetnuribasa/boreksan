package com.boreksan.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${ACCESS_SECRET_KEY}")
    private String accessSecretKey;

    @Value("${REFRESH_SECRET_KEY}")
    private String refreshSecretKey;

    // Access and Refresh token expiration times (ms)
    private static final long ACCESS_TOKEN_EXPIRATION = 1000L * 60 * 15; // 15 minutes
    private static final long REFRESH_TOKEN_EXPIRATION = 1000L * 60 * 60 * 24 * 7; // 7 days
    

    // Extract username from access token
    public String extractUsernameFromAccessToken(String token) {
        return extractClaimFromAccessToken(token, Claims::getSubject);
    }

    // Extract username from refresh token
    public String extractUsernameFromRefreshToken(String token) {
        return extractClaimFromRefreshToken(token, Claims::getSubject);
    }

    // Is the access token valid?
    public boolean isAccessTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsernameFromAccessToken(token);
        return (username.equals(userDetails.getUsername()))
                && !isAccessTokenExpired(token);
    }

    // Is the refresh token valid?
    public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsernameFromRefreshToken(token);
        return (username.equals(userDetails.getUsername()))
                && !isRefreshTokenExpired(token);
    }

    // Generate Access Token (signed with access secret)
    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(userDetails, ACCESS_TOKEN_EXPIRATION, getAccessSignInKey());
    }

    // Generate Refresh Token (signed with refresh secret)
    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails, REFRESH_TOKEN_EXPIRATION, getRefreshSignInKey());
    }

    // --- Common token generation method ---
    private String buildToken(UserDetails userDetails, long expirationMillis, Key signingKey) {
        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // --- Helper Methods ---

    private boolean isAccessTokenExpired(String token) {
        return extractAccessTokenExpiration(token).before(new Date());
    }

    private boolean isRefreshTokenExpired(String token) {
        return extractRefreshTokenExpiration(token).before(new Date());
    }

    private Date extractAccessTokenExpiration(String token) {
        return extractClaimFromAccessToken(token, Claims::getExpiration);
    }

    private Date extractRefreshTokenExpiration(String token) {
        return extractClaimFromRefreshToken(token, Claims::getExpiration);
    }

    private <T> T extractClaimFromAccessToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token, getAccessSignInKey());
        return claimsResolver.apply(claims);
    }

    private <T> T extractClaimFromRefreshToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token, getRefreshSignInKey());
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token, Key key) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getAccessSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(accessSecretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private Key getRefreshSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(refreshSecretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}