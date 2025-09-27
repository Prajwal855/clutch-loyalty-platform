require 'paypal-sdk-rest'

class PaypalService
  include PayPal::SDK::REST

  def initialize
    begin
      PayPal::SDK.configure(
        mode: 'sandbox',  # 'live' for production
        client_id: 'AQ_-TMTor3fEiNl9MdGP93C4HOP9QDYJZRXigCePjdiARmr7ML0QmM2bJaWNBM4S4mlgWWhtCf25ecnY',
        client_secret: 'EFpk6tyPqopLtAtC8EOuA5tQaxTrzjkgINYftNlPHKlCigW4EcsXHpriWWO-RTXzUVCRaRxhR0KWJ9IZ'
      )
    rescue StandardError => e
      Rails.logger.error("Failed to initialize PayPal client: #{e.message}")
      raise "PayPal client initialization failed: #{e.message}"
    end
  end

  def create_order(amount, currency: 'USD')
    begin
      formatted_amount = format('%.2f', amount.to_f)

      payment = Payment.new(
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        transactions: [
          {
            amount: {
              total: formatted_amount,
              currency: currency
            },
            description: 'Order payment'
          }
        ],
        redirect_urls: {
          return_url: 'http://localhost:3000/payments/success',
          cancel_url: 'http://localhost:3000/payments/cancel'
        }
      )

      if payment.create
        {
          success: true,
          order_id: payment.id,
          approval_url: payment.links.find { |link| link.rel == 'approval_url' }&.href
        }
      else
        { success: false, error: payment.error }
      end
    rescue StandardError => e
      { success: false, error: e.message }
    end
  end

  def create_order(amount, currency: 'USD')
    begin
      # Handle nested params (from logs: {"amount"=>10, "payment"=>{"amount"=>10}})
      formatted_amount = format('%.2f', amount.to_f)

      payment = Payment.new(
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        transactions: [
          {
            amount: {
              total: formatted_amount,
              currency: currency
            },
            description: 'Order payment'
          }
        ],
        redirect_urls: {
          return_url: 'http://localhost:3000/payments/success',
          cancel_url: 'http://localhost:3000/payments/cancel'
        }
      )

      Rails.logger.info("PayPal payment request body: #{payment.to_json}")

      if payment.create
        {
          success: true,
          order_id: payment.id,
          approval_url: payment.links.find { |link| link.rel == 'approval_url' }&.href
        }
      else
        Rails.logger.error("PayPal order creation failed: #{payment.error.inspect}")
        { success: false, error: payment.error }
      end
    rescue StandardError => e
      Rails.logger.error("Unexpected error during PayPal order creation: #{e.message}")
      { success: false, error: "Unexpected error: #{e.message}" }
    end
  end

 def capture_order(payment_id)
    begin
      payment = Payment.find(payment_id)
      execution = payment.execute(payer_id: params[:PayerID])

      if execution
        {
          success: true,
          data: payment.to_hash
        }
      else
        Rails.logger.error("PayPal order capture failed: #{payment.error.inspect}")
        { success: false, error: payment.error }
      end
    rescue StandardError => e
      Rails.logger.error("Unexpected error during PayPal order capture: #{e.message}")
      { success: false, error: "Unexpected error: #{e.message}" }
    end
  end
end
