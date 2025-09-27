class UserMailer < ApplicationMailer
    default from: 'nayakaprajwal339@gmail.com'

    def otp_email(user)
        @user = user
        @otp =user.generate_otp 
        mail(to: @user.email, subject: 'Your OTP Code')
    end
end