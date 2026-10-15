<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;

class Role {
    public function handle(Request $r, Closure $next, string $role) {
        abort_unless($r->user() && $r->user()->role === $role, 403, 'Tidak punya akses');
        return $next($r);
    }
}