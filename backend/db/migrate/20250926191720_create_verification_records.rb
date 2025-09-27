class CreateVerificationRecords < ActiveRecord::Migration[8.0]
  def change
    create_table :verification_records do |t|
      t.references :user, null: false, foreign_key: true
      t.string :verification_type
      t.string :proof_hash
      t.text :verified_fields
      t.integer :status
      t.datetime :expires_at

      t.timestamps
    end
  end
end
