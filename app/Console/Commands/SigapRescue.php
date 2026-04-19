<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class SigapRescue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sigap:rescue {--user=sigap_rescue} {--pass=rescue2026}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Emergency recovery command to create or reset a Super Admin account';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $username = $this->option('user');
        $password = $this->option('pass');

        $this->info("--- SIGAP EMERGENCY RESCUE ---");
        $this->info("Target User: {$username}");

        $user = User::where('username', $username)->first();
        
        if ($user) {
            $this->warn("User '{$username}' already exists. Elevating to Super Admin and resetting password...");
            $user->update([
                'password' => Hash::make($password),
                'role' => 'SUPER_ADMIN',
                'is_active' => true
            ]);
        } else {
            $this->info("Creating new Super Admin '{$username}'...");
            $user = User::create([
                'username' => $username,
                'password' => Hash::make($password),
                'fullName' => 'Emergency Rescue Admin',
                'role' => 'SUPER_ADMIN',
                'is_active' => true
            ]);
        }

        $this->info("-------------------------------");
        $this->info("SUCCESS: Super Admin '{$username}' is ready.");
        $this->info("Password has been set to the provided value.");
        $this->info("-------------------------------");
        
        return 0;
    }
}
