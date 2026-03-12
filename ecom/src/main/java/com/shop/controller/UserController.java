package com.shop.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shop.entity.User;
import com.shop.security.JwtUtil;
import com.shop.service.UserService;

import org.springframework.security.core.Authentication;

@RestController
public class UserController {

    private final UserService us;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authManager;

    public UserController(UserService us, JwtUtil jwtUtil, AuthenticationManager authManager) {
        this.us = us;
        this.jwtUtil = jwtUtil;
        this.authManager = authManager;
    }

    @PostMapping("/register")
    public User addUser(@RequestBody User u) {
        return us.register(u);
    }

    @GetMapping("/userlist")
    public List<User> userlist() {
        return us.listUser();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, @RequestParam String password) {
        try {
            Authentication auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
            String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
            String token = jwtUtil.generateToken(username, role);
            return ResponseEntity.ok(Map.of("token", token, "username", username, "role", role));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }
    }
}
