class CreateTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :loyalty_account, null: false, foreign_key: true
      t.integer :transaction_type
      t.bigint :amount
      t.bigint :balance_after
      t.string :reference
      t.integer :status

      t.timestamps
    end
  end
end
