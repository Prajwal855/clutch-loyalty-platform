class DashboardController < BaseController
  before_action :authenticate_user!

  def index
    loyalty_account = current_user.primary_loyalty_account
    recent_transactions = current_user.transactions.order(created_at: :desc).limit(10)
    
    render json: {
      success: true,
      data: {
        user: {
          id: current_user.id,
          email: current_user.email,
          first_name: current_user.first_name,
          last_name: current_user.last_name,
          verified: current_user.verified?,
          status: current_user.status,
          created_at: current_user.created_at
        },
        wallet: loyalty_account ? {
          id: loyalty_account.id,
          hedera_account_id: loyalty_account.account_id,
          balance: loyalty_account.balance,
          formatted_balance: loyalty_account.formatted_balance,
          token_id: loyalty_account.token_id,
          account_type: loyalty_account.account_type,
          status: loyalty_account.status,
          connected_at: loyalty_account.created_at
        } : nil,
        transactions: recent_transactions.map do |tx|
          {
            id: tx.id,
            transaction_type: tx.transaction_type,
            amount: tx.amount,
            balance_after: tx.balance_after,
            reference: tx.reference,
            status: tx.status,
            created_at: tx.created_at
          }
        end,
        stats: {
          total_transactions: current_user.transactions.count,
          total_earned: current_user.transactions.where(transaction_type: :credit).sum(:amount),
          total_spent: current_user.transactions.where(transaction_type: :debit).sum(:amount),
          current_balance: loyalty_account&.balance || 0
        }
      }
    }
  end

  def transactions
    page = params[:page] || 1
    per_page = params[:per_page] || 20
    
    transactions = current_user.transactions
                              .includes(:loyalty_account)
                              .order(created_at: :desc)
                              .page(page)
                              .per(per_page)

    render json: {
      success: true,
      transactions: transactions.map do |tx|
        {
          id: tx.id,
          transaction_type: tx.transaction_type,
          amount: tx.amount,
          formatted_amount: tx.amount.to_f / 100,
          balance_after: tx.balance_after,
          reference: tx.reference,
          status: tx.status,
          created_at: tx.created_at
        }
      end,
      pagination: {
        current_page: transactions.current_page,
        total_pages: transactions.total_pages,
        total_count: transactions.total_count,
        per_page: per_page
      }
    }
  end
end
