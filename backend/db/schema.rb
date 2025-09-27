# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_09_26_210956) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "loyalty_accounts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "account_id"
    t.string "token_id"
    t.bigint "balance"
    t.integer "account_type"
    t.integer "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_loyalty_accounts_on_user_id"
  end

  create_table "transactions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "loyalty_account_id", null: false
    t.integer "transaction_type"
    t.bigint "amount"
    t.bigint "balance_after"
    t.string "reference"
    t.integer "status"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["loyalty_account_id"], name: "index_transactions_on_loyalty_account_id"
    t.index ["user_id"], name: "index_transactions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "first_name"
    t.string "last_name"
    t.integer "status"
    t.string "wallet_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "otp_code"
    t.datetime "otp_sent_at"
    t.string "jti"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["jti"], name: "index_users_on_jti"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "verification_records", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "verification_type"
    t.string "proof_hash"
    t.text "verified_fields"
    t.integer "status"
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_verification_records_on_user_id"
  end

  add_foreign_key "loyalty_accounts", "users"
  add_foreign_key "transactions", "loyalty_accounts"
  add_foreign_key "transactions", "users"
  add_foreign_key "verification_records", "users"
end
