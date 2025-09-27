class BaseController < ApplicationController
    def authenticate_user!
    token = request.headers['Authorization']&.split(' ')&.last
    return render json: { error: 'Unauthorized' }, status: :unauthorized unless token

    begin
        payload = JWT.decode(token, Devise::JWT.config.secret).first
        jti = payload['jti']
        return render json: { error: 'Invalid token payload' }, status: :unauthorized unless jti

        @current_user = User.find_by(jti: jti)
        return render json: { error: 'User not found' }, status: :unauthorized unless @current_user
    rescue JWT::DecodeError => e
        render json: { error: 'Invalid token', details: e.message }, status: :unauthorized
    end
    end


  def current_user
    @current_user
  end
end