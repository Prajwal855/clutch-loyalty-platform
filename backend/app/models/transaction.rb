class Transaction < ApplicationRecord
  belongs_to :user
  belongs_to :loyalty_account
end
