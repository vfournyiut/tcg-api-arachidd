import {Request } from 'express'
  
export interface SignUpBody {
    username: string;
    email: string;
    password: string;
}

export interface SignInBody {
    email: string;
    password: string;
}

export interface SignUpRequest extends Request<{}, unknown, SignUpBody> {}

export interface SignInRequest extends Request<{}, unknown, SignInBody> {}