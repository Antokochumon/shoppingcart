function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html();
                count = parseInt(count) || 0; // Ensure it's a number
                $('#cart-count').html(count + 1);
            }
        },
        error: (err) => {
            console.error("Error adding to cart:", err);
        }
    });
}
$(document).ready(function () {
    $('#cart-button').on('click', function (e) {
        e.preventDefault(); // Prevent the default link behavior
        window.location.href = '/cart'; // Redirect to the cart page
    });
});