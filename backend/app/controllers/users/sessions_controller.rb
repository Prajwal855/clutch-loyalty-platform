class Users::SessionsController < Devise::SessionsController
  respond_to :json

  def create
    user = User.find_for_database_authentication(email: params[:email])
    if user&.valid_password?(params[:password]) && user.status = "verified"
      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
      render json: { status: 200, message: 'Logged in successfully.', token: token ,user: user }
    else
      render json: { status: 401, message: 'Invalid credentials or OTP not verified' }
    end
  end
end
