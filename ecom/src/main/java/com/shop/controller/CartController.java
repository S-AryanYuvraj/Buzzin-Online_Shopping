package com.shop.controller;

import com.shop.entity.Cart;
import com.shop.service.CartService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public Cart getCart(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Not authenticated");
        }
        return cartService.getCart(authentication.getName());
    }

    @PostMapping("/add")
    public Cart addItem(Authentication authentication, @RequestParam Long productId, @RequestParam(defaultValue = "1") int quantity) {
        return cartService.addItem(authentication.getName(), productId, quantity);
    }

    @DeleteMapping("/remove/{itemId}")
    public Cart removeItem(Authentication authentication, @PathVariable Long itemId) {
        return cartService.removeItem(authentication.getName(), itemId);
    }

    @DeleteMapping("/clear")
    public Cart clearCart(Authentication authentication) {
        return cartService.clearCart(authentication.getName());
    }
}
