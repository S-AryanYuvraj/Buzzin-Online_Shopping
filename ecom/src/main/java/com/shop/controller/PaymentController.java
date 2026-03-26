package com.shop.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.shop.entity.Cart;
import com.shop.entity.CartItem;
import com.shop.entity.OrderItem;
import com.shop.entity.User;
import com.shop.repository.OrderItemRepository;
import com.shop.repository.OrderRepository;
import com.shop.repository.UserRepository;
import com.shop.service.CartService;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private final CartService cartService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public PaymentController(CartService cartService, OrderRepository orderRepository,
                             UserRepository userRepository) {
        this.cartService = cartService;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/createOrder")
    public ResponseEntity<?> createOrder(Authentication authentication) {
        try {
            User user = userRepository.findByUsername(authentication.getName());
            Cart cart = cartService.getCart(user.getUsername());

            if (cart.getItems() == null || cart.getItems().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Cart is empty"));
            }

            double totalAmount = cart.getItems().stream()
                    .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                    .sum();

            if (totalAmount <= 0) {
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid total amount"));
            }

            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", (int)(totalAmount * 100)); // amount in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "txn_" + System.currentTimeMillis());

            Order razorpayOrder = razorpay.orders.create(orderRequest);

            com.shop.entity.Order myOrder = new com.shop.entity.Order();
            myOrder.setUser(user);
            myOrder.setTotalAmount(totalAmount);
            myOrder.setStatus("CREATED");
            myOrder.setRazorpayOrderId(razorpayOrder.get("id"));

            for (CartItem ci : cart.getItems()) {
                OrderItem oi = new OrderItem();
                oi.setOrder(myOrder);
                oi.setProduct(ci.getProduct());
                oi.setQuantity(ci.getQuantity());
                oi.setPrice(ci.getProduct().getPrice());
                myOrder.getItems().add(oi);
            }

            orderRepository.save(myOrder);

            return ResponseEntity.ok(Map.of(
                    "orderId", razorpayOrder.get("id"),
                    "amount", totalAmount,
                    "currency", "INR",
                    "keyId", keyId
            ));

        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(Authentication authentication, @RequestBody Map<String, String> payload) {
        String razorpayOrderId = payload.get("razorpay_order_id");
        String razorpayPaymentId = payload.get("razorpay_payment_id");
        String razorpaySignature = payload.get("razorpay_signature");

        try {
            String generatedSignature = calculateSignature(razorpayOrderId + "|" + razorpayPaymentId, keySecret);
            if (generatedSignature.equals(razorpaySignature)) {
                com.shop.entity.Order order = orderRepository.findByRazorpayOrderId(razorpayOrderId);
                if (order != null) {
                    order.setStatus("PAID");
                    order.setRazorpayPaymentId(razorpayPaymentId);
                    orderRepository.save(order);
                    
                    // Clear the cart
                    cartService.clearCart(authentication.getName());

                    return ResponseEntity.ok(Map.of("status", "success"));
                }
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found"));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid signature"));
            }
        } catch (Exception e) {
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    private String calculateSignature(String data, String secret) throws Exception {
        Mac hmacSha256 = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmacSha256.init(secretKeySpec);
        byte[] hash = hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
