package com.boreksan.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.boreksan.entity.enums.Role;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Data
@Entity
@Table(name = "users") // "user" is a reserved keyword in some databases
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true) // No two users can have the same username
    private String username;

    private String password; // Stored in encrypted form

    @Enumerated(EnumType.STRING)
    private Role role;

    private String shopName; // Exp: "Lale Pastanesi"

    private String phone;    // Exp: "0555..."

    private String address;  // Exp: "Atatürk Cad. No:5..."
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // --- Spring Security Methods ---
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}