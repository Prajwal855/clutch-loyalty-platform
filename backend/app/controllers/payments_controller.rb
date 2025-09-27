class PaymentsController < ApplicationController
  before_action :authenticate_user!

  def create_order
    amount = params[:amount].to_f
    paypal_service = PaypalService.new
    result = paypal_service.create_order(amount)

    if result[:success]
      render json: {
        success: true,
        order_id: result[:order_id],
        approval_url: result[:approval_url]
      }
    else
      render json: { success: false, error: result[:error] }, status: :unprocessable_entity
    end
  end

  def capture_order
    order_id = params[:order_id]
    paypal_service = PaypalService.new
    result = paypal_service.capture_order(order_id)

    if result[:success]
      purchase = result[:data].purchase_units.first
      amount = purchase.payments.captures.first.amount.value.to_f

      loyalty_account = current_user.primary_loyalty_account
      spent_cents = (amount * 100).to_i

      hedera_service = HederaService.new
      contract_result = hedera_service.award_loyalty_points(
        loyalty_account.hedera_account_id,
        spent_cents,
        order_id
      )

      if contract_result[:success]
        new_balance = hedera_service.get_token_balance(loyalty_account.hedera_account_id)
        loyalty_account.update!(balance: new_balance)

        current_user.transactions.create!(
          loyalty_account: loyalty_account,
          transaction_type: :credit,
          amount: spent_cents,
          balance_after: new_balance,
          reference: "PayPal Order: #{order_id}",
          status: :completed,
          metadata: {
            paypal_order_id: order_id,
            hedera_transaction_id: contract_result[:transaction_id],
            usd_amount: amount
          }
        )

        render json: {
          success: true,
          message: "Payment successful! Points awarded via smart contract.",
          points_awarded: spent_cents,
          hedera_tx: contract_result[:transaction_id],
          new_balance: new_balance
        }
      else
        render json: { success: false, error: "Smart contract failed: #{contract_result[:error]}" }
      end
    else
      render json: { success: false, error: result[:error] }, status: :unprocessable_entity
    end
  end
end
