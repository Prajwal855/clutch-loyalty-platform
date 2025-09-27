class CreateLoyaltyAccounts < ActiveRecord::Migration[8.0]
  def change
    create_table :loyalty_accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :account_id
      t.string :token_id
      t.bigint :balance
      t.integer :account_type
      t.integer :status

      t.timestamps
    end
  end
end
