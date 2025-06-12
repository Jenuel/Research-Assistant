from pydantic import BaseModel, EmailStr, constr

class UserRegistrationSchema(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    first_name: constr(min_length=1)
    last_name: constr(min_length=1)

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
