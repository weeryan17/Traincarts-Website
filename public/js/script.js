$(document).ready(function () {
    $("*[data-elmlink]").click(function (e) {
        var elm = $(e.currentTarget);
        console.log(elm.attr("data-elmlink"));
        window.location.href = elm.attr("data-elmlink");
    });

    $.fn.animateText = function (newText, time = 500) {
        //TODO improve this so it creates the ts-text element without me needing to make it myself
        var originalText = this.find(".ts-text").text();
        var chars = originalText.length + newText.length;
        var timeInterval = time/chars;
        var originalSize = originalText.length;
        var newSize = 0;
        var nextTextParts = newText.substr(0,1);
        this.append("<span class='ts-text-bar'>|</span>");
        var elm = this;
        var interval = window.setInterval(function () {
            if (originalSize !== 0) {
                originalText = originalText.substring(0, originalText.length - 1);
                originalSize--;
                elm.find(".ts-text").text(originalText);
            } else if (newSize < newText.length) {
                newSize++;
                elm.find(".ts-text").text(nextTextParts);
                nextTextParts += newText.substr(newSize, 1);
            } else{
                elm.find(".ts-text-bar").remove();
                clearInterval(interval);
            }
        }, timeInterval);
    }
});