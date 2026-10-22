<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gentle reminders by web push. Pushes carry no content: the server only
     * knows a push address and when to knock. The words shown are chosen on
     * the device.
     */
    public function up(): void
    {
        Schema::create('reminder_subscriptions', function (Blueprint $table) {
            $table->char('id', 32)->primary();
            $table->char('token_hash', 64);
            $table->text('endpoint');
            $table->string('timezone', 64);
            $table->char('time', 5);
            $table->char('days', 7);
            $table->timestamp('next_due_at')->index();
            $table->timestamp('last_sent_at')->nullable();
            $table->unsignedTinyInteger('failures')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_subscriptions');
    }
};
