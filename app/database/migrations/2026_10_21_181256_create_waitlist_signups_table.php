<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Waitlist emails from resolvrapp.com. Deliberately minimal: no IP address,
     * no user agent, nothing about the visitor beyond the address they gave us.
     */
    public function up(): void
    {
        Schema::create('waitlist_signups', function (Blueprint $table) {
            $table->id();
            $table->string('email', 191)->unique();
            $table->string('source', 64)->nullable();
            $table->timestamp('confirmation_sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_signups');
    }
};
