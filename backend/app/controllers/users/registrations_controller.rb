class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  def create
    user = User.new(sign_up_params)
    if user.save
      UserMailer.otp_email(user).deliver_now if user.email.present?
      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
      render json: { status: 200, message: 'Signed up successfully.', token: token, user: user.as_json(only: [:id, :email, :first_name, :last_name]) }
    else
      render json: { status: 422, message: user.errors.full_messages.to_sentence }
    end
  end

  def verify_otp
    user = User.find_by(email: params[:email])
    if user.verify_otp(params[:otp_code])
      render json: { status: 200, message: 'OTP verified successfully' }
    else
      render json: { status: 422, message: 'Invalid OTP code' }
    end
  end

  def resend_otp
    user = User.find_by(email: params[:email])
    if user&.email.present?
      UserMailer.otp_email(user).deliver_now
      render json: { status: 200, message: 'OTP resent successfully' }
    else
      render json: { status: 422, message: 'No email found for current user.' }
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:email, :first_name, :last_name, :password, :wallet_address)
  end
end
