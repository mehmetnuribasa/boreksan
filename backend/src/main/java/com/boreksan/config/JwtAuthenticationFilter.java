package com.boreksan.config;

import com.boreksan.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        // 1. İstek başlığında "Authorization" var mı?
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        // Token yoksa veya Bearer ile başlamıyorsa zincire devam et (Anonim giriş)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Token işlemlerini TRY-CATCH içine alıyoruz
        try {
            // "Bearer " kısmını kesip sadece token'ı al
            jwt = authHeader.substring(7);
            
            // Access token olduğu varsayımıyla username'i çıkar
            // Eğer token bozuksa burası hata fırlatır!
            userEmail = jwtService.extractUsernameFromAccessToken(jwt);

            // Kullanıcı adı varsa ve sistemde henüz doğrulanmadıysa
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                
                // Access token geçerliyse içeri al
                if (jwtService.isAccessTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }

            // Her şey yolundaysa devam et
            filterChain.doFilter(request, response);

        } catch (Exception e) {
            
            // Konsola hatayı bas ki loglarda görelim
            System.err.println("JWT Doğrulama Hatası: " + e.getMessage());

            // Cevabı 401 UNAUTHORIZED olarak ayarla
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");

            // JSON formatında hata mesajını yaz
            String jsonError = String.format(
                    "{\"error\": \"Gecersiz veya Hatali Token\", \"details\": \"%s\"}", 
                    e.getMessage()
            );
            
            response.getWriter().write(jsonError);
            // Zinciri kır ve bitir (return)
        }
    }
}