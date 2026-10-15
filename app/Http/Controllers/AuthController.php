<?php
namespace App\Http\Controllers;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller {
    public function login(Request $r) {
        $u = User::where('email', $r->email)->first();
        if (!$u || !Hash::check((string) $r->password, $u->password))
            return response()->json(['message' => 'Email atau kata sandi salah'], 422);
        return ['token' => $u->createToken('web')->plainTextToken, 'role' => $u->role, 'nama' => $u->name];
    }
}