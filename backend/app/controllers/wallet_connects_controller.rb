class WalletConnectsController < BaseController
  before_action :authenticate_user!
  def connect_wallet
    hedera_account_id = params[:hedera_account_id]

    unless hedera_account_id.present? && hedera_account_id.match?(/^0\.0\.\d+$/)
      return render json: { success: false, error: 'Invalid Hedera account ID' }, status: :bad_request
    end

    loyalty_account = current_user.primary_loyalty_account || current_user.loyalty_accounts.create!(
      account_id: hedera_account_id,
      token_id: ENV['LOYALTY_TOKEN_ID'],
      balance: 0,
      account_type: :primary,
      status: :active
    )
    loyalty_account.update!(account_id: hedera_account_id)

    render json: {
      success: true,
      message: 'Wallet connected successfully',
      hedera_account_id: hedera_account_id,
      loyalty_account: loyalty_account
    }
  rescue => e
    render json: { success: false, error: e.message }, status: :internal_server_error
  end
end
