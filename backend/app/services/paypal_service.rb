# app/services/paypal_service.rb
require 'paypal_server_sdk'

class PaypalService
  def initialize
    @client = PaypalServerSdk::Client.new(
      environment: Environment::SANDBOX, # change to Environment::LIVE in production
      client_id: ENV['PAYPAL_CLIENT_ID'],
      client_secret: ENV['PAYPAL_CLIENT_SECRET'],
      logging_configuration: LoggingConfiguration.new(
        log_level: Logger::INFO
      )
    )
  end

  # Step 1: Create an order
  def create_order(amount, currency: "USD")
    request = {
      'body' => OrderRequest.new(
        intent: CheckoutPaymentIntent::CAPTURE,
        purchase_units: [
          PurchaseUnitRequest.new(
            amount: AmountWithBreakdown.new(
              currency_code: currency,
              value: amount.to_s
            )
          )
        ]
      )
    }

    result = @client.orders.create_order(request)
    if result.success?
      {
        success: true,
        order_id: result.data.id,
        approval_url: result.data.links.find { |l| l.rel == "approve" }&.href
      }
    else
      { success: false, error: result.errors }
    end
  end

  # Step 2: Capture order after approval
  def capture_order(order_id)
    result = @client.orders.capture_order(order_id, { 'body' => {} })

    if result.success?
      {
        success: true,
        data: result.data
      }
    else
      { success: false, error: result.errors }
    end
  end
end
