Rails.application.routes.draw do
  devise_for :users,
             path: '',
             path_names: {
               sign_in: 'login',
               sign_out: 'logout',
               registration: 'signup'
             },
             controllers: {
               registrations: 'users/registrations',
               sessions: 'users/sessions'
             }

  devise_scope :user do
    post 'signup/verify_otp', to: 'users/registrations#verify_otp'
    post 'signup/resend_otp', to: 'users/registrations#resend_otp'
  end

  post 'wallet_connect', to: 'wallet_connects#connect_wallet'
  get 'dashboard', to: 'dashboard#index'
  get 'dashboard/transactions', to: 'dashboard#transactions'

  post 'payment/create_order', to: 'payments#create_order'

  get '/payments/success', to: 'payments#success'
  get '/payments/cancel', to: 'payments#cancel'




  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
