class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
    include Devise::JWT::RevocationStrategies::JTIMatcher
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  def jwt_payload
    super
  end


  has_many :loyalty_accounts, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :verification_records, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :first_name, :last_name, presence: true

  def generate_otp
    self.otp_code = rand(100000..999999).to_s
    self.otp_sent_at = Time.current
    self.created_at ||= Time.current
    save!
    otp_code
  end

  def verified?
    status == 'verified'
  end

  def primary_loyalty_account
    loyalty_accounts.last
  end

  def total_loyalty_balance
    loyalty_accounts.sum(:balance)
  end

  def verify_otp(entered_otp)
    return false if otp_code.blank? || otp_sent_at.blank?

    if otp_code == entered_otp && otp_sent_at > 15.minutes.ago
      self.status = "verified"
      self.otp_code = nil
      save
      true
    else
      false
    end
  end
end
