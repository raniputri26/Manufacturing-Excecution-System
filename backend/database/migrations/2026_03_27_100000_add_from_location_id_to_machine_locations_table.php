<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('machine_locations', function (Blueprint $table) {
            $table->foreignId('from_location_id')->nullable()->constrained('locations')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('machine_locations', function (Blueprint $table) {
            $table->dropForeign(['from_location_id']);
            $table->dropColumn('from_location_id');
        });
    }
};
