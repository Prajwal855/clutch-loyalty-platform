class PaymentsController < ApplicationController
  before_action :authenticate_user!

def create_order
    paypal_service = PaypalService.new
    amount = params[:amount] || params[:payment]&.[](:amount)  # Handle nested params from logs
    result = paypal_service.create_order(amount, currency: params[:currency] || 'USD')

    if result[:success]
      render json: { order_id: result[:order_id], approval_url: result[:approval_url] }, status: :ok
    else
      render json: { error: result[:error] }, status: :unprocessable_entity
    end
  end

  def success
    # After approval redirect; capture the order here
    paypal_service = PaypalService.new
    result = paypal_service.capture_order(params[:orderID])  # orderID from PayPal redirect

    if result[:success]
      # Update your order in DB, redirect to thank-you page
      redirect_to thank_you_path(order_id: params[:orderID])
    else
      redirect_to error_path(error: result[:error])
    end
  end

  def cancel
    redirect_to cart_path, notice: 'Payment cancelled'
  end
end
