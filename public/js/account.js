function enable_twofa() {
    $.ajax({
        url: '/account/twofa',
        success: function (data, status, jqXHR) {
            console.log(data);
            var json = data;
            $("#twofa-secret").val(json.secret);
            $("#twofa-qrcode").attr('src', json.qr);
            $("#twofa-qrcode").attr('width', '166');
            $("#twofa-qrcode").attr('height', '166');
            $("#twofa").show();
            $("#twofa").css({'height': ''});
            $("#button-twofa").hide();
        }
    });
}

function remove_twofa() {
    var code = $("#twofa-code").val();
    if (code === "") {
        $("#remove-twofa").show();
    } else {
        $.ajax({
            url: '/account/twofa',
            method: "DELETE",
            data: {
                code: code
            },
            success: function (data) {
                if (data.error === null) {
                    window.location.href = '/account'
                } else {
                    $("#remove-error").text(data.error);
                }
            }
        })
    }
}

function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

$(document).ready(function () {
    $("#twofa-code").val("");
});