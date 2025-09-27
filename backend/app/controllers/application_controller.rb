class ApplicationController < ActionController::API
  before_action :ensure_json_request

  private

  def ensure_json_request
    # Skip for GET requests (like dashboard) since they don't send Content-Type
    return if request.get?
    
    # Check for JSON Content-Type for POST/PUT/PATCH requests
    return if request.headers["Content-Type"] =~ /application\/json/
    
    render json: { error: "Content-Type must be application/json" }, status: 406
  end
end
