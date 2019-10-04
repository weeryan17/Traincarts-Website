$(document).ready(function () {
    var action = window.location.hash.substr(1);
    console.log(action);
    var signup = $("#signup");
    var login = $("#login");
    var loginButton = $("#login-button");
    var signupButton = $("#signup-button");
    if (action === "signup") {
        console.log("signup activate");
        login.addClass("ts-hidden");
        signup.removeClass("ts-hidden");
        loginButton.removeClass("active");
        signupButton.addClass("active");
        $(".ts-text").text("Sign Up");
        document.title = "Sign Up | TrainCarts"
    }

    signupButton.click(function () {
        $(".ts-header-card").animateText("Sign Up", 1000);
        login.hide(500, function () {
            signup.hide();
            signup.removeClass("ts-hidden");
            signup.show(500);
            login.show();
            login.addClass("ts-hidden");
        });
        loginButton.removeClass("active");
        signupButton.addClass("active");
        document.title = "Sign Up | TrainCarts"
    });

    loginButton.click(function () {
        $(".ts-header-card").animateText("Login", 1000);
        signup.hide(500, function () {
            login.hide();
            login.removeClass("ts-hidden");
            login.show(500);
            signup.show();
            signup.addClass("ts-hidden");
        });
        loginButton.addClass("active");
        signupButton.removeClass("active");
        document.title = "Login | TrainCarts"
    });
});