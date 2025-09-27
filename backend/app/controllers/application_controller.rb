class ApplicationController < ActionController::API
    before_action :ensure_json_request

  private

  def ensure_json_request
    return if request.headers["Content-Type"] =~ /json/
    render nothing: true, status: 406
  end

    def logged_in_user
        jwt_payload = JWT.decode(request.headers['token'], ENV['secret_key_base']).first
        @current_user = User.find(jwt_payload['sub'])
        if @current_user
            return @current_user
        else
            render json: {
                message: "no Active Session for this current User"
            }, status: 401
        end
    end
end
