function do_email() {
    var email = $("#email").val();
    var urlParams = new URLSearchParams(window.location.search);
    $.ajax({
        url: '/account/forgot',
        method: 'PUT',
        data: {
            email: email,
            redirect: urlParams.get('redirect')
        },
        success: function (data, status, jqCHR) {
            if (data.error == null) {
                $("#code-div").show();
                $("#submit-button").show();
                $("#email-button").hide();
            }
        }
    })
}