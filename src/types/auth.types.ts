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

export interface SignUpRequest extends Request<{}, any, SignUpBody> {}

export interface SignInRequest extends Request<{}, any, SignInBody> {}