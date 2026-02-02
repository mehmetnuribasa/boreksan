package com.boreksan.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // CORS ayarları artık SecurityConfig.java üzerinden yönetiliyor.
    // Spring Security filtresi istekleri MVC katmanından önce karşıladığı için
    // konfigürasyonun orada yapılması daha sağlıklıdır.
}