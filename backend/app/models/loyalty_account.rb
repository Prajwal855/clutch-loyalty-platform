class LoyaltyAccount < ApplicationRecord
  belongs_to :user
  has_many :transactions, dependent: :destroy

  validates :account_id, presence: true, uniqueness: true
  validates :balance, presence: true, numericality: { greater_than_or_equal_to: 0 }

  # enum account_type: { primary: 0, secondary: 1 }
  # enum status: { active: 0, inactive: 1, frozen: 2 }

  def formatted_balance
    balance.to_f / 100 # Convert cents to decimal
  end

  def add_balance!(amount, reference = nil)
    increment!(:balance, amount)
    transactions.create!(
      user: user,
      transaction_type: :credit,
      amount: amount,
      reference: reference,
      balance_after: balance
    )
  end
end
